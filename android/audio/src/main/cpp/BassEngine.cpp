#include "BassEngine.h"

#include <android/log.h>

#include <algorithm>
#include <cmath>

#define LOGW(...) __android_log_print(ANDROID_LOG_WARN, "BassEngine", __VA_ARGS__)

namespace {
/** Seconds a released note takes to fade (Tone.Sampler's release in the web app). */
constexpr double kNoteRelease = 0.3;
/** Fade used by stopAll(): quick, but long enough not to click. */
constexpr double kStopRelease = 0.03;
/** Click envelope, like the web metronome's triangle synth: 1 ms attack, ~45 ms decay. */
constexpr double kClickAttack = 0.001;
constexpr double kClickDecay = 0.012;  // time constant
constexpr double kClickLength = 0.08;
constexpr float kClickGain = 0.5f;
constexpr float kSilence = 1e-4f;

double midiToFrequency(int midi) { return 440.0 * std::pow(2.0, (midi - 69) / 12.0); }
}  // namespace

bool BassEngine::openStream() {
    oboe::AudioStreamBuilder builder;
    builder.setDirection(oboe::Direction::Output)
        ->setPerformanceMode(oboe::PerformanceMode::LowLatency)
        ->setSharingMode(oboe::SharingMode::Exclusive)
        ->setFormat(oboe::AudioFormat::Float)
        ->setChannelCount(oboe::ChannelCount::Stereo)
        ->setUsage(oboe::Usage::Media)
        ->setContentType(oboe::ContentType::Music)
        ->setDataCallback(this)
        ->setErrorCallback(this);
    oboe::Result result = builder.openStream(stream_);
    if (result != oboe::Result::OK) {
        LOGW("openStream failed: %s", oboe::convertToText(result));
        return false;
    }
    // Two bursts: as little latency as the device allows without glitches.
    stream_->setBufferSizeInFrames(stream_->getFramesPerBurst() * 2);
    sampleRate_.store(stream_->getSampleRate(), std::memory_order_release);
    result = stream_->requestStart();
    if (result != oboe::Result::OK) {
        LOGW("requestStart failed: %s", oboe::convertToText(result));
        stream_->close();
        stream_.reset();
        return false;
    }
    return true;
}

bool BassEngine::start() {
    std::lock_guard<std::mutex> lock(streamLock_);
    if (stream_) return true;
    return openStream();
}

void BassEngine::stop() {
    std::lock_guard<std::mutex> lock(streamLock_);
    if (!stream_) return;
    stream_->stop();
    stream_->close();
    stream_.reset();
}

void BassEngine::onErrorAfterClose(oboe::AudioStream *, oboe::Result error) {
    // Headphones plugged or unplugged, or the device changed: reopen on the new output.
    // The frame clock keeps counting, so anything Kotlin schedules stays consistent.
    LOGW("stream closed: %s, reopening", oboe::convertToText(error));
    std::lock_guard<std::mutex> lock(streamLock_);
    stream_.reset();
    openStream();
}

void BassEngine::loadSample(int midi, std::vector<float> data, int rate) {
    samples_.push_back({midi, midiToFrequency(midi), rate, std::move(data)});
    std::sort(samples_.begin(), samples_.end(), [](const Sample &a, const Sample &b) { return a.midi < b.midi; });
}

int64_t BassEngine::latencyFrames() {
    std::lock_guard<std::mutex> lock(streamLock_);
    if (!stream_) return 0;
    auto latency = stream_->calculateLatencyMillis();
    if (latency) return static_cast<int64_t>(latency.value() * stream_->getSampleRate() / 1000.0);
    return stream_->getBufferSizeInFrames();
}

void BassEngine::push(const Event &event) {
    std::lock_guard<std::mutex> lock(pushLock_);
    int tail = tail_.load(std::memory_order_relaxed);
    int next = (tail + 1) % kQueueSize;
    if (next == head_.load(std::memory_order_acquire)) {
        LOGW("event queue full, dropping a sound");
        return;
    }
    queue_[tail] = event;
    tail_.store(next, std::memory_order_release);
}

void BassEngine::note(double frequency, float velocity, int64_t startFrame, int64_t durationFrames) {
    push({Kind::Note, startFrame, durationFrames, frequency, velocity});
}

void BassEngine::click(double frequency, float velocity, int64_t startFrame) {
    push({Kind::Click, startFrame, 0, frequency, velocity});
}

void BassEngine::stopAll() { push({Kind::StopAll, 0, 0, 0, 0}); }

const BassEngine::Sample *BassEngine::nearestSample(double frequency) const {
    if (samples_.empty()) return nullptr;
    double midi = 69 + 12 * std::log2(frequency / 440.0);
    // Like Tone.Sampler: the closest recording; on a tie, the higher one (shifted down).
    const Sample *best = &samples_[0];
    for (const Sample &s : samples_) {
        if (std::abs(s.midi - midi) <= std::abs(best->midi - midi)) best = &s;
    }
    return best;
}

float BassEngine::releaseMultiplier(double seconds) const {
    // Exponential fade reaching -60 dB after `seconds`.
    return static_cast<float>(std::exp(std::log(0.001) / (seconds * sampleRate())));
}

void BassEngine::startVoice(const Event &event) {
    Voice *voice = nullptr;
    for (Voice &v : voices_) {
        if (!v.active) {
            voice = &v;
            break;
        }
    }
    if (!voice) {
        // All busy: steal the quietest (usually the oldest, fading) voice.
        voice = &*std::min_element(voices_.begin(), voices_.end(),
                                   [](const Voice &a, const Voice &b) { return a.envelope < b.envelope; });
    }
    *voice = Voice{};
    voice->active = true;
    voice->start = event.start;
    voice->gain = event.velocity;
    if (event.kind == Kind::Click) {
        voice->click = true;
        voice->step = event.frequency / sampleRate();
        voice->gain *= kClickGain;
        return;
    }
    const Sample *sample = nearestSample(event.frequency);
    if (!sample) {
        voice->active = false;
        return;
    }
    voice->sample = sample;
    voice->step = (event.frequency / sample->frequency) * sample->rate / sampleRate();
    voice->releaseAt = event.start + std::max<int64_t>(event.duration, 0);
    voice->release = releaseMultiplier(kNoteRelease);
}

oboe::DataCallbackResult BassEngine::onAudioReady(oboe::AudioStream *stream, void *audio, int32_t frames) {
    auto *out = static_cast<float *>(audio);
    const int channels = stream->getChannelCount();
    const int64_t now = frames_.load(std::memory_order_relaxed);
    const double rate = sampleRate();

    // 1. Take new commands.
    int head = head_.load(std::memory_order_relaxed);
    const int tail = tail_.load(std::memory_order_acquire);
    while (head != tail) {
        const Event &event = queue_[head];
        if (event.kind == Kind::StopAll) {
            pendingCount_ = 0;
            const float fade = releaseMultiplier(kStopRelease);
            for (Voice &v : voices_) {
                if (!v.active) continue;
                v.releaseAt = std::min(v.releaseAt, now);
                v.release = std::min(v.release, fade);
                if (v.start >= now) v.active = false;  // not started yet: drop it
            }
        } else if (pendingCount_ < kPending) {
            pending_[pendingCount_++] = event;
        } else {
            LOGW("too many pending sounds, dropping one");
        }
        head = (head + 1) % kQueueSize;
    }
    head_.store(head, std::memory_order_release);

    // 2. Start the sounds due in this buffer (late ones start right away).
    for (int i = 0; i < pendingCount_;) {
        if (pending_[i].start < now + frames) {
            Event event = pending_[i];
            event.start = std::max(event.start, now);
            startVoice(event);
            pending_[i] = pending_[--pendingCount_];
        } else {
            ++i;
        }
    }

    // 3. Mix.
    std::fill(out, out + frames * channels, 0.0f);
    const int64_t attack = std::max<int64_t>(1, static_cast<int64_t>(kClickAttack * rate));
    const int64_t clickLength = static_cast<int64_t>(kClickLength * rate);
    const float clickDecay = static_cast<float>(std::exp(-1.0 / (kClickDecay * rate)));
    for (Voice &v : voices_) {
        if (!v.active) continue;
        int32_t f = static_cast<int32_t>(std::max<int64_t>(0, v.start - now));
        for (; f < frames && v.active; ++f) {
            float value;
            if (v.click) {
                value = static_cast<float>(4.0 * std::abs(v.phase - 0.5) - 1.0);
                v.phase += v.step;
                if (v.phase >= 1) v.phase -= 1;
                float env = v.age < attack ? static_cast<float>(v.age) / attack : (v.envelope *= clickDecay);
                value *= env;
                if (++v.age > clickLength) v.active = false;
            } else {
                const auto index = static_cast<size_t>(v.position);
                if (index + 1 >= v.sample->data.size()) {
                    v.active = false;
                    break;
                }
                const float frac = static_cast<float>(v.position - index);
                const float a = v.sample->data[index];
                value = a + frac * (v.sample->data[index + 1] - a);
                v.position += v.step;
                if (now + f >= v.releaseAt) {
                    v.envelope *= v.release;
                    if (v.envelope < kSilence) v.active = false;
                }
                value *= v.envelope;
            }
            const float sample = value * v.gain;
            for (int c = 0; c < channels; ++c) out[f * channels + c] += sample;
        }
    }
    for (int32_t i = 0; i < frames * channels; ++i) out[i] = std::clamp(out[i], -1.0f, 1.0f);

    frames_.store(now + frames, std::memory_order_release);
    return oboe::DataCallbackResult::Continue;
}

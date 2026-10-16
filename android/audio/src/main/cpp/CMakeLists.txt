cmake_minimum_required(VERSION 3.22.1)
project(bassically_audio CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Oboe comes as a prefab package from its AAR (com.google.oboe:oboe).
find_package(oboe REQUIRED CONFIG)

add_library(bassically_audio SHARED BassEngine.cpp jni.cpp)
target_compile_options(bassically_audio PRIVATE -Wall -Wextra -O3 -ffast-math)
target_link_libraries(bassically_audio oboe::oboe log)

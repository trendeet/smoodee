FROM amazoncorretto:17-alpine AS build
WORKDIR /app
COPY gradlew .
COPY gradle gradle
COPY build.gradle .
COPY settings.gradle .
COPY src src
RUN chmod +x gradlew && ./gradlew bootJar -x test --no-daemon

FROM amazoncorretto:17-alpine
WORKDIR /app

# 영상 렌더링 의존성 설치
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    py3-pip \
    font-noto \
    font-noto-cjk \
    && pip3 install --no-cache-dir pillow pilmoji --break-system-packages

# 텍스트 렌더 스크립트 복사
COPY scripts/ scripts/

COPY --from=build /app/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "-Dspring.profiles.active=prod", "app.jar"]

FROM eclipse-temurin:17-jdk-jammy AS builder
WORKDIR /workspace

COPY gradlew .
COPY gradle ./gradle
COPY build.gradle .
COPY settings.gradle .
RUN chmod +x gradlew && sed -i 's/\r$//' gradlew
RUN ./gradlew dependencies --no-daemon -q 2>/dev/null || true

COPY src ./src
COPY scripts ./scripts
RUN ./gradlew bootJar --no-daemon -x test -x spotlessCheck

FROM eclipse-temurin:17-jre-jammy AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    fonts-nanum \
    fonts-noto-cjk \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --no-cache-dir pilmoji pillow

COPY --from=builder /workspace/build/libs/*.jar app.jar
COPY --from=builder /workspace/scripts ./scripts

ENV EMOJI_CACHE_DIR=/app/.cache/smoodee_emoji
ENV SPRING_PROFILES_ACTIVE=prod

EXPOSE 8080

ENTRYPOINT ["java", \
  "-Xms256m", "-Xmx1g", \
  "-Djava.awt.headless=true", \
  "-jar", "app.jar"]

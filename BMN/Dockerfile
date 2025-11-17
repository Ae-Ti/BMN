# Multi-stage Dockerfile for BMN app
# Stage 1: build the app (runs Gradle which also builds the React front-end)
FROM eclipse-temurin:17-jdk as builder

ENV GRADLE_USER_HOME=/cache/.gradle

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl unzip nodejs npm ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
COPY . /workspace

# Use the included Gradle wrapper to build the fat jar (bootJar). This will also run the frontend build task defined in build.gradle
RUN chmod +x ./gradlew
RUN ./gradlew clean bootJar -x test --no-daemon

# Stage 2: runtime image
FROM eclipse-temurin:17-jre
WORKDIR /app

# Copy the application jar from the builder stage
COPY --from=builder /workspace/build/libs/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]

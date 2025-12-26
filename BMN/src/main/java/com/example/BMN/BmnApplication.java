package com.example.BMN;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.util.TimeZone;

@SpringBootApplication
public class BmnApplication {

	public static void main(String[] args) {
		// Force JVM default timezone to KST so LocalDateTime.now() persists in Korea time in all environments
		TimeZone.setDefault(TimeZone.getTimeZone("Asia/Seoul"));
		SpringApplication.run(BmnApplication.class, args);
	}

}

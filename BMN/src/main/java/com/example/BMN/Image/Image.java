package com.example.BMN.Image;

import groovyjarjarantlr4.v4.codegen.model.Lexer;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Image {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String filename;
    private String contentType;

    @Lob  // Binary Large Object (BLOB)로 저장
    @Column(nullable = false)
    private byte[] data;

}

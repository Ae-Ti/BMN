package com.example.BMN.Image;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class Image {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Lob  // Binary Large Object (BLOB)로 저장
    @Column(columnDefinition = "BLOB")
    private byte[] imageData;
}

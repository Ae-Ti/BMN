// src/main/java/com/example/BMN/User/PublicUserDTO.java
package com.example.BMN.User;

import lombok.Getter;
import lombok.Setter;

/**
 * 외부(프론트엔드) 공개용 사용자 DTO
 * - 이메일, 닉네임, 아이디 등 기본 정보만 포함
 * - 비밀번호 등 내부 정보는 제외
 * - 팔로우 관련 데이터 포함 (팔로잉/팔로워 수, 내가 팔로우 중인지 여부)
 */
@Getter
@Setter
public class PublicUserDTO {

    private Long id;
    private String userName;        // 아이디
    private String nickname;        // 닉네임
    private String email;           // 이메일 (공개 여부는 설정 가능)
    private String introduction;    // 소개글
    private Boolean emailVerified;  // 이메일 인증 여부

    private Long followingCount;    // 팔로잉 수
    private Long followerCount;     // 팔로워 수
    private Boolean followedByMe;   // 현재 로그인한 사용자가 이 유저를 팔로우 중인지 여부

    /** 기본 변환 메서드: SiteUser → PublicUserDTO */
    public static PublicUserDTO fromEntity(SiteUser u) {
        if (u == null) return null;
        PublicUserDTO dto = new PublicUserDTO();
        dto.setId(u.getId());
        dto.setUserName(u.getUserName());
        dto.setNickname(u.getNickname());
        dto.setEmail(u.getEmail());
        dto.setIntroduction(u.getIntroduction());

        // 기본 팔로우 정보는 null로 초기화 (컨트롤러/서비스에서 설정)
        dto.setFollowingCount(null);
        dto.setFollowerCount(null);
        dto.setFollowedByMe(null);

        return dto;
    }

    /** 이메일 비공개 버전 */
    public static PublicUserDTO withoutEmail(SiteUser u) {
        if (u == null) return null;
        PublicUserDTO dto = new PublicUserDTO();
        dto.setId(u.getId());
        dto.setUserName(u.getUserName());
        dto.setNickname(u.getNickname());
        dto.setEmail(null);
        dto.setIntroduction(u.getIntroduction());

        dto.setFollowingCount(null);
        dto.setFollowerCount(null);
        dto.setFollowedByMe(null);

        return dto;
    }
}
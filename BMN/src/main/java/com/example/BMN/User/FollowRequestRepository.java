package com.example.BMN.User;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FollowRequestRepository extends JpaRepository<FollowRequest, Long> {

    Optional<FollowRequest> findByRequesterAndTargetAndStatus(SiteUser requester, SiteUser target, FollowRequest.Status status);

    List<FollowRequest> findByTargetAndStatusOrderByCreatedAtDesc(SiteUser target, FollowRequest.Status status);

    void deleteByRequesterAndTargetAndStatus(SiteUser requester, SiteUser target, FollowRequest.Status status);
}


package com.example.BMN.User;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FollowRequestRepository extends JpaRepository<FollowRequest, Long> {

    @EntityGraph(attributePaths = {"requester", "target"})
    Optional<FollowRequest> findTopByRequesterIdAndStatusOrderByCreatedAtDesc(Long requesterId, FollowRequest.Status status);

    Optional<FollowRequest> findByRequesterIdAndTargetIdAndStatus(Long requesterId, Long targetId, FollowRequest.Status status);

    @EntityGraph(attributePaths = {"requester", "target"})
    Optional<FollowRequest> findWithRequesterById(Long id);

    Optional<FollowRequest> findByRequesterAndTargetAndStatus(SiteUser requester, SiteUser target, FollowRequest.Status status);

    List<FollowRequest> findByTargetAndStatusOrderByCreatedAtDesc(SiteUser target, FollowRequest.Status status);

    void deleteByRequesterAndTargetAndStatus(SiteUser requester, SiteUser target, FollowRequest.Status status);
}

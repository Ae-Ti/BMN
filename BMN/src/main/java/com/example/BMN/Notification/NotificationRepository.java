package com.example.BMN.Notification;

import com.example.BMN.User.SiteUser;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"user"})
    List<Notification> findByUserOrderByCreatedAtDesc(SiteUser user);
}

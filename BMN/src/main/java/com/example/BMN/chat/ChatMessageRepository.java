package com.example.BMN.chat;

import com.example.BMN.User.SiteUser;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    @Query("select m from ChatMessage m where (m.sender = :me and m.receiver = :partner) or (m.sender = :partner and m.receiver = :me) order by m.createdAt desc")
    Page<ChatMessage> findThread(@Param("me") SiteUser me, @Param("partner") SiteUser partner, Pageable pageable);

    @Query("select m from ChatMessage m where (m.sender = :me or m.receiver = :me) order by m.createdAt desc")
    Page<ChatMessage> findRecentForUser(@Param("me") SiteUser me, Pageable pageable);

    @Query("select m.sender.userName as partner, count(m) as unreadCount from ChatMessage m where m.receiver = :me and m.readAt is null group by m.sender.userName")
    List<UnreadCount> countUnreadByPartner(@Param("me") SiteUser me);

    @Modifying
    @Query("update ChatMessage m set m.readAt = current_timestamp where m.sender = :partner and m.receiver = :me and m.readAt is null")
    int markRead(@Param("me") SiteUser me, @Param("partner") SiteUser partner);

    interface UnreadCount {
        String getPartner();
        long getUnreadCount();
    }
}

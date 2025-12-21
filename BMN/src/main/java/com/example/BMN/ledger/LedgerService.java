package com.example.BMN.ledger;

import com.example.BMN.User.SiteUser;
import com.example.BMN.User.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.TemporalAdjusters;
import java.util.*;

@Service
@Transactional
public class LedgerService {

    private final LedgerTransactionRepository repo;
    private final UserRepository userRepository;

    public LedgerService(LedgerTransactionRepository repo, UserRepository userRepository) {
        this.repo = repo;
        this.userRepository = userRepository;
    }

    private SiteUser currentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null)
            throw new AccessDeniedException("Unauthenticated");

        String principal = auth.getName();

        // 1) userName 매칭
        Optional<SiteUser> userOpt = userRepository.findByUserName(principal);
        // 4) 숫자면 id로 조회
        if (userOpt.isEmpty() && principal.chars().allMatch(Character::isDigit)) {
            userOpt = userRepository.findById(Long.parseLong(principal));
        }

        return userOpt.orElseThrow(() -> new AccessDeniedException("User not found: " + principal));
    }

    public LedgerTransaction create(LocalDate date, TransactionType type, String name, long amount) {
        SiteUser me = currentUser();
        LedgerTransaction t = new LedgerTransaction();
        t.setDate(date);
        t.setType(type);
        t.setName(name);
        t.setAmount(amount);
        t.setAuthor(me);
        return repo.save(t);
    }

    @Transactional(readOnly = true)
    public List<LedgerTransaction> listByDate(LocalDate date) {
        SiteUser me = currentUser();
        return repo.findAllByAuthorAndDate(me, date).stream()
                .sorted(Comparator.comparing(LedgerTransaction::getId))
                .toList();
    }

    @Transactional(readOnly = true)
    public LedgerSummaryResponse summary(LocalDate anchorDate, String periodRaw) {
        SiteUser me = currentUser();
        String period = (periodRaw == null || periodRaw.isBlank()) ? "month" : periodRaw.toLowerCase();

        LocalDate start;
        LocalDate end;
        switch (period) {
            case "week" -> {
                start = anchorDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
                end = anchorDate.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));
            }
            case "year" -> {
                start = anchorDate.withDayOfYear(1);
                end = anchorDate.withDayOfYear(anchorDate.lengthOfYear());
            }
            case "month" -> {
                start = anchorDate.withDayOfMonth(1);
                end = anchorDate.withDayOfMonth(anchorDate.lengthOfMonth());
            }
            default -> throw new IllegalArgumentException("Unsupported period: " + period);
        }

        List<LedgerTransaction> list = repo.findAllByAuthorAndDateBetween(me, start, end).stream()
                .sorted(Comparator.comparing(LedgerTransaction::getDate).thenComparing(LedgerTransaction::getId))
                .toList();

        long income = 0;
        long expense = 0;
        List<LedgerSummaryResponse.TransactionView> views = new ArrayList<>(list.size());
        for (LedgerTransaction t : list) {
            if (t.getType() == TransactionType.INCOME) income += t.getAmount();
            else expense += t.getAmount();
            views.add(new LedgerSummaryResponse.TransactionView(t.getId(), t.getDate().toString(), t.getType(), t.getName(), t.getAmount()));
        }

        return new LedgerSummaryResponse(period, start.toString(), end.toString(), income, expense, income - expense, views);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> monthTotals(int year, int month) {
        SiteUser me = currentUser();
        YearMonth ym = YearMonth.of(year, month);
        var start = ym.atDay(1);
        var end   = ym.atEndOfMonth();
        var all   = repo.findAllByAuthorAndDateBetween(me, start, end);

        long totalMonthIncome = 0;
        long totalMonthExpense = 0;

        Map<LocalDate, long[]> agg = new HashMap<>();
        for (var t : all) {
            var arr = agg.computeIfAbsent(t.getDate(), d -> new long[2]);
            if (t.getType() == TransactionType.INCOME) {
                arr[0] += t.getAmount();
                totalMonthIncome += t.getAmount();
            } else {
                arr[1] += t.getAmount();
                totalMonthExpense += t.getAmount();
            }
        }

        List<Map<String, Object>> days = new ArrayList<>();
        for (int d = 1; d <= ym.lengthOfMonth(); d++) {
            var cur = ym.atDay(d);
            var arr = agg.getOrDefault(cur, new long[]{0, 0});
            days.add(Map.of("date", cur.toString(), "totalIncome", arr[0], "totalExpense", arr[1]));
        }
        return Map.of(
                "year", year,
                "month", month,
                "days", days,
                "totalIncome", totalMonthIncome,
                "totalExpense", totalMonthExpense
        );
    }

    public LedgerTransaction patch(Long id, TransactionType type, String name, Long amount, LocalDate date) {
        SiteUser me = currentUser();
        LedgerTransaction t = repo.findByIdAndAuthor(id, me)
                .orElseThrow(() -> new AccessDeniedException("Not found or no permission"));

        if (type   != null) t.setType(type);
        if (name   != null) t.setName(name);
        if (amount != null) t.setAmount(amount);
        if (date   != null) t.setDate(date);
        return t;
    }

    public void delete(Long id) {
        SiteUser me = currentUser();
        long deleted = repo.deleteByIdAndAuthor(id, me);
        if (deleted == 0) throw new AccessDeniedException("Not found or no permission");
    }
}
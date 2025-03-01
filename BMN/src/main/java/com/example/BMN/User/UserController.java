package com.example.BMN.User;


import jakarta.validation.Valid;
import org.springframework.ui.Model;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Controller;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
@Controller
@RequestMapping("/user")
public class UserController {

    private final UserService userService;

    @PostMapping("/signup")
    public void signup(@Valid UserCreateForm userCreateForm, BindingResult bindingResult) {
        if (bindingResult.hasErrors()) {
            System.out.println("애러발생");
        }
        if (!userCreateForm.getPassword1().equals(userCreateForm.getPassword2())) {
            bindingResult.rejectValue("password2", "passwordInCorrect",
                    "2개의 패스워드가 일치하지 않습니다.");
            System.out.println("애러발생");
        }
        try {
            userService.create(userCreateForm.getUserName(),
                    userCreateForm.getEmail(), userCreateForm.getPassword1(), userCreateForm.getIntroduction()
            ,userCreateForm.getNickname(), userCreateForm.getAge(), userCreateForm.getSex());
        }catch(DataIntegrityViolationException e) {
            e.printStackTrace();
            bindingResult.reject("signupFailed", "이미 등록된 사용자입니다.");
        }catch(Exception e) {
            e.printStackTrace();
            bindingResult.reject("signupFailed", e.getMessage());

        }
    }
/* 회원가입 thymeleaf 임시페이지용

@GetMapping("/signup")
public String signupForm(Model model) {
    model.addAttribute("userCreateForm", new UserCreateForm());
    return "signup";  // signup.html 렌더링
}

    @PostMapping("/signup")
    public String signup(@Valid @ModelAttribute UserCreateForm userCreateForm, BindingResult bindingResult) {
        if (bindingResult.hasErrors()) {
            return "signup"; // 에러 발생 시 다시 폼으로 이동
        }

        if (!userCreateForm.getPassword1().equals(userCreateForm.getPassword2())) {
            bindingResult.rejectValue("password2", "passwordInCorrect", "2개의 패스워드가 일치하지 않습니다.");
            return "signup";
        }

        try {
            userService.create(userCreateForm.getUserName(),
                    userCreateForm.getEmail(), userCreateForm.getPassword1(),
                    userCreateForm.getIntroduction(), userCreateForm.getNickname(),
                    userCreateForm.getAge(), userCreateForm.getSex());
            return "redirect:/user/login"; // 회원가입 성공 시 로그인 페이지로 이동
        } catch (DataIntegrityViolationException e) {
            bindingResult.reject("signupFailed", "이미 등록된 사용자입니다.");
            return "signup";
        } catch (Exception e) {
            bindingResult.reject("signupFailed", e.getMessage());
            return "signup";
        }
    }
*/
}

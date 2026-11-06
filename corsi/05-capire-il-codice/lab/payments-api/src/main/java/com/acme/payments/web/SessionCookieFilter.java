package com.acme.payments.web;

import java.io.IOException;
import java.util.UUID;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Assegna un cookie di sessione a chi non ne ha ancora uno.
 */
@Component
public class SessionCookieFilter extends OncePerRequestFilter {

    static final String SESSION_COOKIE = "PAYSESSION";
    static final int MAX_AGE_SECONDS = 30 * 60;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (!hasSession(request)) {
            String sessionId = UUID.randomUUID().toString();
            // un cookie per tutta l'API, non leggibile da JavaScript,
            // che scade dopo mezz'ora di inattività
            Cookie cookie = new Cookie(SESSION_COOKIE, sessionId);
            cookie.setPath("/");
            cookie.setHttpOnly(true);
            cookie.setMaxAge(MAX_AGE_SECONDS);
            response.addCookie(cookie);
        }
        chain.doFilter(request, response);
    }

    private boolean hasSession(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return false;
        }
        for (Cookie cookie : cookies) {
            if (SESSION_COOKIE.equals(cookie.getName())) {
                return true;
            }
        }
        return false;
    }
}

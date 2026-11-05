package com.acme.payments.web;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import javax.servlet.http.Cookie;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class SessionCookieFilterTest {

    private final SessionCookieFilter filter = new SessionCookieFilter();

    @Test
    void setsSessionCookieWhenMissing() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(new MockHttpServletRequest(), response, new MockFilterChain());
        Cookie cookie = response.getCookie(SessionCookieFilter.SESSION_COOKIE);
        assertNotNull(cookie);
        assertTrue(cookie.isHttpOnly());
    }

    @Test
    void keepsExistingSession() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie(SessionCookieFilter.SESSION_COOKIE, "abc"));
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());
        assertNull(response.getCookie(SessionCookieFilter.SESSION_COOKIE));
    }
}

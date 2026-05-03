package com.smoodee.global.security;

import com.smoodee.auth.service.AuthService;
import com.smoodee.user.domain.User;
import com.smoodee.user.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

  private final UserService userService;
  private final AuthService authService;
  private final JwtProvider jwtProvider;

  @Value("${app.jwt.refresh-token-expiry-ms}")
  private long refreshTokenExpiryMs;

  @Value("${app.oauth2.redirect-uri:http://localhost:3000/oauth2/callback}")
  private String frontendRedirectUri;

  @Override
  public void onAuthenticationSuccess(
      HttpServletRequest request, HttpServletResponse response, Authentication authentication)
      throws IOException {
    OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken) authentication;
    OAuth2User oauthUser = oauthToken.getPrincipal();
    String provider = oauthToken.getAuthorizedClientRegistrationId();

    Map<String, Object> attributes = oauthUser.getAttributes();
    OAuth2UserInfo userInfo = OAuth2UserInfo.of(provider, attributes);

    User user = userService.upsertFromOAuth2(userInfo);
    String refreshToken = authService.createAndSaveRefreshToken(user.getId());

    ResponseCookie refreshCookie =
        ResponseCookie.from("refreshToken", refreshToken)
            .httpOnly(true)
            .secure(true)
            .sameSite("None")
            .path("/")
            .maxAge(refreshTokenExpiryMs / 1000)
            .build();
    response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());

    log.info("OAuth2 login success: userId={}", user.getId());
    response.sendRedirect(frontendRedirectUri);
  }
}

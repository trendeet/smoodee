package com.smoodee.global.security;

import com.smoodee.auth.service.AuthService;
import com.smoodee.auth.service.OAuthCodeStore;
import com.smoodee.user.domain.User;
import com.smoodee.user.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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
  private final OAuthCodeStore oAuthCodeStore;

  @Value("${app.jwt.refresh-token-expiry-ms}")
  private long refreshTokenExpiryMs;

  @Value("${app.oauth2.redirect-uri:http://localhost:3000/oauth2/callback}")
  private String frontendRedirectUri;

  @Value("${app.cookie.secure:true}")
  private boolean cookieSecure;

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
    String rawRefreshToken = authService.createAndSaveRefreshToken(user.getId());
    String code = oAuthCodeStore.createCode(user.getId(), rawRefreshToken);

    log.info("OAuth2 login success: userId={}", user.getId());
    response.sendRedirect(frontendRedirectUri + "?code=" + code);
  }
}

package com.smoodee.global.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smoodee.global.security.JwtFilter;
import com.smoodee.global.security.OAuth2SuccessHandler;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Slf4j
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

  private final JwtFilter jwtFilter;
  private final OAuth2SuccessHandler oAuth2SuccessHandler;
  private final ObjectMapper objectMapper;

  @Value("${app.cors.allowed-origins}")
  private String allowedOriginsRaw;

  @Value("${app.oauth2.redirect-uri:http://localhost:3000/oauth2/callback}")
  private String frontendRedirectUri;

  private String getFrontendLoginUri() {
    return frontendRedirectUri.replace("/oauth2/callback", "/login");
  }

  @Bean
  public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http.csrf(AbstractHttpConfigurer::disable)
        .cors(cors -> cors.configurationSource(corsConfigurationSource()))
        .sessionManagement(
            session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
        .authorizeHttpRequests(
            auth ->
                auth.requestMatchers(
                        "/swagger-ui/**",
                        "/swagger-ui.html",
                        "/v3/api-docs",
                        "/v3/api-docs/**",
                        "/oauth2/**",
                        "/login/**",
                        "/api/v1/auth/refresh",
                        "/api/v1/templates/**",
                        "/actuator/health",
                        "/api/v1/personal/colorwork/**",
                        "/api/v1/projects/*/assets",
                        "/api/v1/render/personal/**",
                        "/api/v1/render/jobs/**",
                        "/api/v1/assets/*/stream")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/v1/templates/**")
                    .permitAll()
                    .anyRequest()
                    .authenticated())
        .exceptionHandling(
            ex ->
                ex.authenticationEntryPoint(
                    (request, response, authException) -> {
                      response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                      response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                      response.setCharacterEncoding("UTF-8");
                      objectMapper.writeValue(
                          response.getWriter(),
                          Map.of(
                              "error",
                              Map.of(
                                  "code", "UNAUTHORIZED",
                                  "message", "인증이 필요합니다.")));
                    }))
        .oauth2Login(
            oauth2 ->
                oauth2
                    .successHandler(oAuth2SuccessHandler)
                    .failureHandler(
                        (request, response, exception) -> {
                          log.error("OAuth2 login failed: {}", exception.getMessage(), exception);
                          response.sendRedirect(getFrontendLoginUri() + "?error=oauth2");
                        }))
        .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
    return http.build();
  }

  @Bean
  public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(Arrays.asList(allowedOriginsRaw.split(",")));
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
    config.setAllowedHeaders(List.of("*"));
    config.setAllowCredentials(true);
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
  }
}

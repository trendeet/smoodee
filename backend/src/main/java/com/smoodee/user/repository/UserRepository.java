package com.smoodee.user.repository;

import com.smoodee.user.domain.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {

  Optional<User> findByProviderAndSubject(String provider, String subject);
}

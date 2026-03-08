package com.smoodee.global.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class ApiResponse<T> {

  private final T data;

  @JsonInclude(JsonInclude.Include.NON_NULL)
  private final PageMeta meta;

  public static <T> ApiResponse<T> of(T data) {
    return new ApiResponse<>(data, null);
  }

  public static <T> ApiResponse<T> of(T data, PageMeta meta) {
    return new ApiResponse<>(data, meta);
  }

  @Getter
  @AllArgsConstructor(access = AccessLevel.PRIVATE)
  public static class PageMeta {
    private final int page;
    private final int size;
    private final long total;

    public static PageMeta of(int page, int size, long total) {
      return new PageMeta(page, size, total);
    }
  }
}

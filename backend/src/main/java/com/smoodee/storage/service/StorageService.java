package com.smoodee.storage.service;

import com.smoodee.global.exception.BusinessException;
import com.smoodee.global.exception.ErrorCode;
import java.io.InputStream;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

@Slf4j
@Service
@RequiredArgsConstructor
public class StorageService {

  private final S3Client s3Client;
  private final S3Presigner s3Presigner;

  @Value("${app.storage.s3.bucket}")
  private String bucket;

  public void put(InputStream inputStream, String key, String contentType, long contentLength) {
    try {
      PutObjectRequest request =
          PutObjectRequest.builder().bucket(bucket).key(key).contentType(contentType).build();
      s3Client.putObject(request, RequestBody.fromInputStream(inputStream, contentLength));
      log.info("S3 upload success: key={}", key);
    } catch (Exception e) {
      log.error("S3 upload failed: key={}", key, e);
      throw new BusinessException(ErrorCode.FILE_UPLOAD_FAILED);
    }
  }

  public String presignGet(String key, Duration ttl) {
    GetObjectPresignRequest presignRequest =
        GetObjectPresignRequest.builder()
            .signatureDuration(ttl)
            .getObjectRequest(GetObjectRequest.builder().bucket(bucket).key(key).build())
            .build();
    PresignedGetObjectRequest presigned = s3Presigner.presignGetObject(presignRequest);
    return presigned.url().toString();
  }

  public InputStream getObject(String key) {
    try {
      GetObjectRequest request = GetObjectRequest.builder().bucket(bucket).key(key).build();
      return s3Client.getObject(request);
    } catch (Exception e) {
      log.error("S3 getObject failed: key={}", key, e);
      throw new BusinessException(ErrorCode.ASSET_NOT_FOUND);
    }
  }
}

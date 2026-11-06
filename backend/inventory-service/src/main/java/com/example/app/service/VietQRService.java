package com.example.app.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Service
public class VietQRService {

    @Value("${vietqr.bank-id:MB}")
    private String bankId;

    @Value("${vietqr.account-no:0000000000}")
    private String accountNo;

    @Value("${vietqr.account-name:FRESHVEND}")
    private String accountName;

    public String generateQrUrl(String orderCode, BigDecimal amount) {
        String addInfo = URLEncoder.encode(orderCode, StandardCharsets.UTF_8);
        return String.format(
            "https://img.vietqr.io/image/%s-%s-compact2.png?amount=%s&addInfo=%s&accountName=%s",
            bankId,
            accountNo,
            amount.toPlainString(),
            addInfo,
            URLEncoder.encode(accountName, StandardCharsets.UTF_8)
        );
    }
}
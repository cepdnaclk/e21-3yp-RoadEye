package com.roadeye.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmergencyContactDTO {
    private Long id;
    private Long userId;
    private String contactName;
    private String phoneNumber;
    private String email;
    private String relationship;
    private Boolean isPrimary;
    private String createdAt;
}

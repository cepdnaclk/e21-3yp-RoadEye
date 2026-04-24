package com.roadeye.dto;

import lombok.*;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmergencyContactDTO {
    private UUID id;
    private UUID userId;
    private String contactName;
    private String phoneNumber;
    private String email;
    private String relationship;
    private Boolean isPrimary;
    private String createdAt;
    private String channel;
    private Boolean enabled;
}

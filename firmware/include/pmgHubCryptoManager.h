
#pragma once

#include <pmgHubConfig.h>
#include <Arduino.h>
#include <stdint.h>
#include <stddef.h>

namespace pmgHub {

    class CryptoManager {
        
        public:

            static constexpr size_t SALT_SIZE  = 16;
            static constexpr size_t HASH_SIZE  = 32;
            static constexpr size_t TOKEN_SIZE = 32;
            static constexpr size_t NONCE_SIZE = 16;

            static String generateSalt();
            static String generateToken();
            static String generateNonce();

            // PBKDF2-HMAC-SHA256
            static bool hashPassword(const String& password, const String& saltHex, String& hashHex, uint32_t iterations = pmgHub::config::PBKDF2_HMAC_SHA256_iterations);
            static bool verifyPassword(const String& password, const String& saltHex, const String& expectedHashHex, uint32_t iterations = pmgHub::config::PBKDF2_HMAC_SHA256_iterations);

            // HMAC-SHA256
            static bool computeHMAC(const String& secretHex, const String& message, String& hmacHex);
            static bool verifyHMAC(const String& secretHex, const String& message, const String& expectedHmacHex);

        private:

            static String randomHex(size_t byteCount);
            static String toHex(const uint8_t* data, size_t length);
            static bool fromHex(const String& hex, uint8_t* output, size_t outputLength);
            static bool constantTimeEqual(const uint8_t* a, const uint8_t* b, size_t length);

    };

};
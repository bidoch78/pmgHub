
// #include "pmgHubCryptoManager.h"

// #include <esp_random.h>
// #include <mbedtls/md.h>
// #include <mbedtls/pkcs5.h>
// #include <mbedtls/platform_util.h>

// using namespace pmgHub;

// // =====================================================
// // Convert binary -> hexal
// // =====================================================

// String CryptoManager::toHex(const uint8_t* data, size_t length) {
    
//     static constexpr char HEX_DIGITS[] = "0123456789abcdef";

//     String result;

//     if (!result.reserve(length * 2)) {
//         return String();
//     }

//     for (size_t i = 0; i < length; ++i) {
//         result += HEX_DIGITS[data[i] >> 4];
//         result += HEX_DIGITS[data[i] & 0x0F];
//     }

//     return result;
// }

// // =====================================================
// // Convert hexa -> binary
// // =====================================================

// bool CryptoManager::fromHex(const String& hex, uint8_t* output, size_t outputLength) {

//     if (hex.length() != outputLength * 2) return false;

//     auto hexValue = [](char c) -> int {
//         if (c >= '0' && c <= '9')
//             return c - '0';

//         if (c >= 'a' && c <= 'f')
//             return c - 'a' + 10;

//         if (c >= 'A' && c <= 'F')
//             return c - 'A' + 10;

//         return -1;
//     };

//     for (size_t i = 0; i < outputLength; ++i) {

//         int high = hexValue(hex[i * 2]);
//         int low  = hexValue(hex[i * 2 + 1]);

//         if (high < 0 || low < 0) {
//             return false;
//         }

//         output[i] = static_cast<uint8_t>(
//             (high << 4) | low
//         );

//     }

//     return true;
// }

// // =====================================================
// // Comparaison en temps constant
// // =====================================================

// bool CryptoManager::constantTimeEqual(const uint8_t* a, const uint8_t* b, size_t length) {
    
//     uint8_t difference = 0;

//     for (size_t i = 0; i < length; ++i) {
//         difference |= a[i] ^ b[i];
//     }

//     return difference == 0;

// }

// // =====================================================
// // Generate Random Hexadecimal Values
// // =====================================================

// String CryptoManager::randomHex(size_t byteCount) {

//     if (byteCount == 0 || byteCount > TOKEN_SIZE) return String();

//     uint8_t buffer[TOKEN_SIZE] = {};

//     esp_fill_random(buffer, byteCount);

//     String result = toHex(buffer, byteCount);

//     mbedtls_platform_zeroize(buffer, sizeof(buffer));

//     return result;

// }

// String CryptoManager::generateSalt() { return randomHex(SALT_SIZE); }

// String CryptoManager::generateToken() { return randomHex(TOKEN_SIZE); }

// String CryptoManager::generateNonce() { return randomHex(NONCE_SIZE); }

// // =====================================================
// // Hash Password with PBKDF2-HMAC-SHA256
// // =====================================================

// bool CryptoManager::hashPassword( const String& password, const String& saltHex, String& hashHex, uint32_t iterations) {
    
//     hashHex = "";

//     if (password.isEmpty()) return false;

//     uint8_t salt[SALT_SIZE] = {};
//     uint8_t hash[HASH_SIZE] = {};

//     if (!fromHex(saltHex, salt, sizeof(salt))) return false;

//     const mbedtls_md_info_t* md = mbedtls_md_info_from_type(MBEDTLS_MD_SHA256);
//     if (md == nullptr) {
//         mbedtls_platform_zeroize(salt, sizeof(salt));
//         return false;
//     }

//     mbedtls_md_context_t context;
//     mbedtls_md_init(&context);

//     int result = mbedtls_md_setup(&context, md, 1);
//     if (result == 0) {
//         result = mbedtls_pkcs5_pbkdf2_hmac(
//             &context,
//             reinterpret_cast<const unsigned char*>(password.c_str()),
//             password.length(),
//             salt,
//             sizeof(salt),
//             iterations,
//             sizeof(hash),
//             hash
//         );
//     }

//     mbedtls_md_free(&context);
//     mbedtls_platform_zeroize(salt, sizeof(salt));

//     if (result != 0) {
//         mbedtls_platform_zeroize(hash, sizeof(hash));
//         return false;
//     }

//     hashHex = toHex(hash, sizeof(hash));

//     mbedtls_platform_zeroize(hash, sizeof(hash));

//     return hashHex.length() == HASH_SIZE * 2;

// }

// // =====================================================
// // Verify Password with PBKDF2-HMAC-SHA256
// // =====================================================

// bool CryptoManager::verifyPassword(const String& password, const String& saltHex, const String& expectedHashHex, uint32_t iterations) {
    
//     uint8_t expected[HASH_SIZE] = {};

//     if (!fromHex(expectedHashHex, expected, sizeof(expected))) return false;

//     String calculatedHex;

//     if (!hashPassword(password, saltHex, calculatedHex, iterations)) {
//         mbedtls_platform_zeroize(expected, sizeof(expected));
//         return false;
//     }

//     uint8_t calculated[HASH_SIZE] = {};

//     if (!fromHex(calculatedHex, calculated, sizeof(calculated))) {
//         mbedtls_platform_zeroize(expected, sizeof(expected));
//         return false;
//     }

//     bool valid = constantTimeEqual(expected, calculated, HASH_SIZE);

//     mbedtls_platform_zeroize(expected, sizeof(expected));

//     mbedtls_platform_zeroize(calculated, sizeof(calculated));

//     // clear the calculatedHex string to remove sensitive data from memory
//     calculatedHex = "";

//     return valid;
// }

// // =====================================================
// // HMAC-SHA256
// // =====================================================

// bool CryptoManager::computeHMAC(const String& secretHex, const String& message, String& hmacHex) {
    
//     hmacHex = "";

//     uint8_t secret[TOKEN_SIZE] = {};
//     uint8_t digest[HASH_SIZE] = {};

//     if (!fromHex(secretHex, secret, sizeof(secret))) return false;

//     const mbedtls_md_info_t* md = mbedtls_md_info_from_type(MBEDTLS_MD_SHA256);

//     if (md == nullptr) {
//         mbedtls_platform_zeroize(secret, sizeof(secret));
//         return false;
//     }

//     int result = mbedtls_md_hmac(
//         md,
//         secret,
//         sizeof(secret),
//         reinterpret_cast<const unsigned char*>(
//             message.c_str()
//         ),
//         message.length(),
//         digest
//     );

//     mbedtls_platform_zeroize(secret, sizeof(secret));

//     if (result != 0) {
//         mbedtls_platform_zeroize(digest, sizeof(digest));
//         return false;
//     }

//     hmacHex = toHex(digest, sizeof(digest));

//     mbedtls_platform_zeroize(digest, sizeof(digest));

//     return hmacHex.length() == HASH_SIZE * 2;
// }

// // =====================================================
// // VERIFY HMAC-SHA256
// // =====================================================

// bool CryptoManager::verifyHMAC(const String& secretHex, const String& message, const String& expectedHmacHex) {
    
//     uint8_t expected[HASH_SIZE] = {};

//     if (!fromHex(expectedHmacHex, expected, sizeof(expected))) return false;

//     String calculatedHex;

//     if (!computeHMAC(secretHex, message, calculatedHex)) {
//         mbedtls_platform_zeroize(expected, sizeof(expected));
//         return false;
//     }

//     uint8_t calculated[HASH_SIZE] = {};

//     if (!fromHex(calculatedHex, calculated, sizeof(calculated))) {
//         mbedtls_platform_zeroize(expected, sizeof(expected));
//         return false;
//     }

//     bool valid = constantTimeEqual(expected, calculated, HASH_SIZE);

//     mbedtls_platform_zeroize(expected, sizeof(expected));

//     mbedtls_platform_zeroize(calculated, sizeof(calculated));

//     // clear the calculatedHex string to remove sensitive data from memory
//     calculatedHex = "";

//     return valid;

// }

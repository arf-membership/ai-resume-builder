# Turkish Character Support in File Uploads

## Problem
Previously, uploading PDF files with Turkish characters (ç, ğ, ı, ö, ş, ü) would cause "File security validation failed" errors because the file sanitization was too aggressive.

## Solution
We've updated the filename sanitization to properly handle Turkish and other international characters by:

1. **Character Mapping**: Converting Turkish characters to their ASCII equivalents
2. **Improved Security**: Maintaining security while supporting international characters
3. **Better User Experience**: Users can now upload files with Turkish names

## Examples

### Before (Failed)
```
özgeçmiş.pdf → ______.pdf (caused security validation failure)
Murat_Şahin_CV.pdf → Murat______CV.pdf (unreadable)
```

### After (Works)
```
özgeçmiş.pdf → ozgecmis.pdf ✅
Murat_Şahin_CV.pdf → Murat_Sahin_CV.pdf ✅
CV_Üçüncü_Kişi.pdf → CV_Ucuncu_Kisi.pdf ✅
İşçi_CV.pdf → Isci_CV.pdf ✅
Görüşme_Belgesi.pdf → Gorusme_Belgesi.pdf ✅
```

## Character Mapping

| Turkish | ASCII | Turkish | ASCII |
|---------|-------|---------|-------|
| ç       | c     | Ç       | C     |
| ğ       | g     | Ğ       | G     |
| ı       | i     | I       | I     |
| ö       | o     | Ö       | O     |
| ş       | s     | Ş       | S     |
| ü       | u     | Ü       | U     |

## Security Features Maintained

- ✅ Directory traversal prevention (`../` blocked)
- ✅ Dangerous characters removed (`<>:"|?*`)
- ✅ Control character removal
- ✅ Length limitations (max 100 characters)
- ✅ XSS prevention

## Debug Information

When uploading, you'll now see helpful debug logs:
```
📁 Filename transformation: {
  original: "özgeçmiş_2024.pdf",
  sanitized: "ozgecmis_2024.pdf", 
  unique: "1735123456789_ozgecmis_2024.pdf",
  filePath: "session_123_abc/1735123456789_ozgecmis_2024.pdf"
}
```

## Testing

Run the tests to verify Turkish character handling:
```bash
npm test turkishCharacterSanitization
```

This update ensures Turkish users can upload their CVs without filename-related errors while maintaining all security protections.

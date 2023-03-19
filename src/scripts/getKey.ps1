# Key path
Add-Type -AssemblyName System.Security

$path = "$env:ProgramFiles\Meveto\AsymmetricEncryptedPrivateKey.enc"

try {
    $cipherText = Get-Content -Path $path -Encoding Byte
    $plainText = [System.Security.Cryptography.ProtectedData]::Unprotect($cipherText, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)
    $plainTextString = [System.Text.Encoding]::UTF8.GetString($plainText)
    Write-Host $plainTextString -NoNewline
} catch {
    Write-Host $_.Exception.Message
    exit 1
}
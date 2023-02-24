param (
    [Parameter(Mandatory=$true)][string]$value
)

Add-Type -AssemblyName System.Security

# The encrypted string is expected to be base64 encoded.
$encryptedBytes = [System.Convert]::FromBase64String($value)

# Decrypt the bytes.
try {
    $decryptedBytes = [System.Security.Cryptography.ProtectedData]::Unprotect($encryptedBytes, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)
}
catch {
    Write-Error $_.Exception.Message
    break
}

# Convert the decrypted bytes to a string.
$decryptedString = [System.Text.Encoding]::UTF8.GetString($decryptedBytes)

# Write the decrypted value to the console host.
Write-Host $decryptedString -NoNewline
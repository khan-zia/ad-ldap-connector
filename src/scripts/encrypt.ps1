param (
    [Parameter(Mandatory=$true)][string]$value
)

Add-Type -AssemblyName System.Security

# Convert the value to a byte array.
$byteArray = [System.Text.Encoding]::UTF8.GetBytes($value)

# Encrypt the bytes.
try {
    $encryptedBytes = [System.Security.Cryptography.ProtectedData]::Protect($byteArray, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)
}
catch {
    Write-Host $_.Exception.Message
    exit 1
}

# Convert the encrypted bytes back to a string
$encryptedString = [System.Convert]::ToBase64String($encryptedBytes)

# Write the encrypted value back to the buffer
Write-Host $encryptedString -NoNewline

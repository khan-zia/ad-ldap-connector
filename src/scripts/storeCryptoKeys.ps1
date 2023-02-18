# Accept private key from the node.js side as a parameter.
param (
    [string]$EncodedPrivateKey
)

# Convert the key from base64 encoding to normal string.
$PrivateKey = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($EncodedPrivateKey))

# Ensure the key could successfully be decoded and it was specified.
if ([string]::IsNullOrEmpty($PrivateKey)) {
    Write-Error "The private key cannot be null or empty."
    return
}

# Location of the keys storage.
$FileDirectory = "C:\Program Files\Meveto"

If (!(Test-Path $FileDirectory)) {
    # Create the "Meveto" folder first if it doesn't exist.
    New-Item -ItemType Directory -Path $FileDirectory | Out-Null
}

# File name that will store the encyrpted version of the private key.
$Target = Join-Path -Path $FileDirectory -ChildPath "AsymmetricEncryptedPrivateKey.enc"

# File name that will store the encyrpted version of the AES key.
$AESTarget = Join-Path -Path $FileDirectory -ChildPath "SymmetricEncryptedPrivateKey.enc"

# Load any external modules
# & "$PSScriptRoot\moduleLoader.ps1"

# Load required .NET modules.
Add-Type -AssemblyName System.Security
Add-Type -AssemblyName System.Security.Cryptography

# Convert key's string to byte array.
$PrivateKeyByteArray = [System.Text.Encoding]::UTF8.GetBytes($PrivateKey)

# Encrypt the private key
$EncryptedPrivateKeyBytes = [ProtectedData]::Protect($PrivateKeyByteArray, $null, [DataProtectionScope]::CurrentUser)

# Generate a 256-bit AES key using a cryptographically secure random number generator.
$AESKey = [byte[]]::new(32)
$RandomNum = [RNGCryptoServiceProvider]::new()
$RandomNum.GetBytes($AESKey)

# Encrypt the AES key
$EncryptedAESKeyBytes = [ProtectedData]::Protect($AESKey, $null, [DataProtectionScope]::CurrentUser)

# Store the encrypted private key at the specified location.
Set-Content -Path $Target -Value $EncryptedPrivateKeyBytes -Encoding Byte

# Store the encrypted AES key at the specified location.
Set-Content -Path $AESTarget -Value $EncryptedAESKeyBytes -Encoding Byte

# $CipherText = Get-Content -Path $Target -Encoding Byte
# $PlainText = [Security.Cryptography.ProtectedData]::Unprotect($CipherText, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
# $PlainTextString = [System.Text.Encoding]::UTF8.GetString($PlainText)
# Write-Output $PlainTextString
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

# Location of the key storage.
$fileDirectory = "C:\Program Files\Meveto"

If (!(Test-Path $fileDirectory)) {
    # Create the "Meveto" folder first if it doesn't exist.
    New-Item -ItemType Directory -Path $fileDirectory | Out-Null
}

# File name that will store the encyrpted version of the private key.
$Target = Join-Path -Path $fileDirectory -ChildPath "MevetoADLDAPEncryptedPrivateKey.enc"

# Make sure required modules are available. If not, install and load them.
& "$PSScriptRoot\loadDeps.ps1"

# Convert key's string to byte array.
$PrivateKeyByteArray = [System.Text.Encoding]::UTF8.GetBytes($PrivateKey)

# Encrypt the private key
Add-Type -AssemblyName System.Security
$EncryptedPrivateKeyBytes = [System.Security.Cryptography.ProtectedData]::Protect($PrivateKeyByteArray, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)

# Store the encrypted private key at the specified location.
Set-Content -Path $Target -Value $EncryptedPrivateKeyBytes -Encoding Byte

# $CipherText = Get-Content -Path $Target -Encoding Byte
# $PlainText = [Security.Cryptography.ProtectedData]::Unprotect($CipherText, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
# $PlainTextString = [System.Text.Encoding]::UTF8.GetString($PlainText)
# Write-Output $PlainTextString
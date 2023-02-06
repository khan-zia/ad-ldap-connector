# The tag that references the private key of the connector.
$Target = "MevetoADLDAPConnectorPrivateKey"

# Add the stored credential instance of the private key to the powershell session.
$StoredCredential = Get-StoredCredential -Target $Target

# Get the private key from the stored credential and convert it to byte array.
$EncryptedPrivateKey = $StoredCredential.Password
$EncryptedPrivateKeyBytes = [System.Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($EncryptedPrivateKey)

# Add .NET's security assembly to the powershell sessions.
$SecurityAssembly = Add-Type -AssemblyName System.Security

# Decrypt the private key.
$PrivateKey = [System.Security.Cryptography.ProtectedData]::Unprotect($EncryptedPrivateKeyBytes, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)

# Convert the decrypted private key bytes to normal string.
$PrivateKey = [System.Runtime.InteropServices.Marshal]::PtrToStringUni($PrivateKey)

# Write the private key to the console.
Write-Host $PrivateKey

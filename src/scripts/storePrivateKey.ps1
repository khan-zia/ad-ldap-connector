# Accept private key from the node.js side as a parameter.
param (
    [string]$PrivateKey
)

# Key that will reference the private key later on.
$Target = "MevetoADLDAPConnectorPrivateKey"

# Convert the string of private key in to a secure string.
# Then, convert the secure string to a byte array.
$SecureStringPrivateKey = ConvertTo-SecureString -String $PrivateKey -AsPlainText -Force
$PrivateKeyByteArray = [System.Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($SecureStringPrivateKey)

# Encrypt the private key's byte array content.
$SecurityAssembly = Add-Type -AssemblyName System.Security
$EncryptedPrivateKey = [System.Security.Cryptography.ProtectedData]::Protect($PrivateKeyByteArray, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentMachine)

# Store the private key in the Windows Credentials Manager.
Add-StoredCredential -Target $Target -Password $EncryptedPrivateKey
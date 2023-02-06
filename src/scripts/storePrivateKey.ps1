# Accept private key from the node.js side as a parameter.
param (
    [string]$EncodedPrivateKey
)

# Key that will reference the private key later on.
$Target = "MevetoADLDAPConnectorPrivateKey"

$PrivateKey = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($EncodedPrivateKey))

if ([string]::IsNullOrEmpty($PrivateKey)) {
    Write-Error "The private key cannot be null or empty."
    return
}

# Make sure required modules are available. If not, install and load them.
& "$PSScriptRoot\loadDeps.ps1"

# Convert the string of private key in to a secure string.
# Then, convert the secure string to a byte array.
$SecureStringPrivateKey = ConvertTo-SecureString -String $PrivateKey -AsPlainText -Force
$PrivateKeyByteArray = [System.Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($SecureStringPrivateKey)
Write-Output $SecureStringPrivateKey
# Encrypt the private key's byte array content.
$SecurityAssembly = Add-Type -AssemblyName System.Security
# $EncryptedPrivateKey = [System.Security.Cryptography.ProtectedData]::Protect($PrivateKeyByteArray, $null, [System.Security.Cryptography.DataProtectionScope]::LocalMachine)

# Store the private key in the Windows Credentials Manager.
# Add-StoredCredential -Target $Target -Password $EncryptedPrivateKey
# Expect LDAP connection credentials as parameters.
param (
    [Parameter(Mandatory = $true)][string] $ConString,
    [Parameter(Mandatory = $false)][string] $BaseDN,
    [Parameter(Mandatory = $true)][string] $Username,
    [Parameter(Mandatory = $true)][string] $Password
)

# Convert the password to a secure string and nullify the plain string version.
$SecurePassword = ConvertTo-SecureString $Password -AsPlainText -Force
$Password = $null

if ($BaseDN) {
    $LdapUrl = "$ConString/$baseDN"
} else {
    # Base DN is undefined, search the entire directory tree
    $LdapUrl = $ConString
}

# Create a new LDAP connection object.
$LDAP = New-Object System.DirectoryServices.DirectoryEntry(
    $LdapUrl,
    $Username,
    [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword)),
    [System.DirectoryServices.AuthenticationTypes]::Secure
)

try {
    $LDAP.RefreshCache()
    Write-Host "ConnectionSuccessful" -NoNewLine
    $LDAP.Dispose()
}
catch {
    Write-Host $_.Exception.Message -NoNewline
}
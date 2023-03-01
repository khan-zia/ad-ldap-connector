# Expect LDAP connection credentials as parameters.
param (
    [Parameter(Mandatory = $true)][string] $conString,
    [Parameter(Mandatory = $false)][string] $baseDN,
    [Parameter(Mandatory = $true)][string] $username,
    [Parameter(Mandatory = $true)][string] $password
)

# Convert the password to a secure string and nullify the plain string version.
$securePassword = ConvertTo-SecureString $password -AsPlainText -Force
$password = $null

if ($baseDN ) {
    $LdapUrl = "$conString/$baseDN"
} else {
    # Base DN is undefined, search the entire directory tree
    $LdapUrl = $conString
}

try {
    # Create a new LDAP connection object.
    $LDAP = New-Object System.DirectoryServices.DirectoryEntry(
        $LdapUrl,
        $username,
        [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)),
        [System.DirectoryServices.AuthenticationTypes]::Secure
    )
 
    $LDAP.RefreshCache()
    Write-Host "ConnectionSuccessful" -NoNewLine
    $LDAP.Dispose()
}
catch {
    Write-Host $_.Exception.Message -NoNewline
    exit 1
}
# Expect LDAP connection credentials as parameters.
param (
    [string]$ConString,
    [string]$BaseDN,
    [string]$Username,
    [string]$Password
)

# Create a new LDAP connection object.
$LDAP = New-Object System.DirectoryServices.DirectoryEntry($ConString, $Username, [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)), "Secure")

try {
    # Try to bind ()connect to the LDAP server
    $LDAP.Bind()

    # If the connection succeeds, out "true"
    Write-Host "true"
}
catch {
    # If the connection fails, output  the exception message.
    Write-Host "$_.Exception.Message"
}
finally {
    # Dispose the LDAP object.
    $LDAP.Dispose()
}

$version = Get-ItemProperty HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\* | Where-Object {$_.DisplayName -eq "Meveto AD/LDAP Connector"} | Select-Object DisplayVersion

try {
    if ($null -eq $version) {
        Write-Host "ConnectorNotFound"
    } else {
        Write-Host $version -NoNewline
    }
} catch {
    Write-Host $_.Exception.Message
    exit 1
}
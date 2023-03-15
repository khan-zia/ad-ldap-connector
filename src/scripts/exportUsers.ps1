[CmdletBinding()]
param (
    [Parameter(Mandatory=$true)][string]$server,
    [Parameter(Mandatory=$true)][string]$username,
    [Parameter(Mandatory=$true)][string]$password,
    [Parameter()][string]$searchBase,
    [Parameter()][string]$dateString
)

$credential = New-Object System.Management.Automation.PSCredential($username, (ConvertTo-SecureString -String $password -AsPlainText -Force))

Import-Module ActiveDirectory

if ($dateString) {
    if ($searchBase) {
        $command = "Get-ADUser -SearchBase `"$searchBase`" -Server $server -Credential `$credential -Filter {whenChanged -ge `$dateString} -Properties objectGuid, emailAddress, givenName, sn, name, memberOf, whenChanged"
    } else {
        $command = "Get-ADUser -Server $server -Credential `$credential -Filter {whenChanged -ge `$dateString} -Properties objectGuid, emailAddress, givenName, sn, name, memberOf, whenChanged"
    }
} else {
    if ($searchBase) {
        $command = "Get-ADUser -SearchBase `"$searchBase`" -Server $server -Credential `$credential -Filter * -Properties objectGuid, emailAddress, givenName, sn, name, memberOf"
    } else {
        $command = "Get-ADUser -Server $server -Credential `$credential -Filter * -Properties objectGuid, emailAddress, givenName, sn, name, memberOf"
    }
}

try {
    $users = Invoke-Expression $command | ForEach-Object {
        $groups = $_.memberOf | ForEach-Object { (Get-ADGroup -Server $server -Credential $credential $_).objectGuid }

        $displayName = if ($_.givenName) {
            if ($_.sn) {
                "$($_.givenName) $($_.sn)"
            } else {
                $_.givenName
            }
        } else {
            $_.name
        }

        $_ | Select-Object emailAddress, objectGuid, @{Name="DisplayName";Expression={$displayName}}, @{Name="Groups";Expression={$groups -join ":"}}
    }

    $fileDirectory = "$env:ProgramFiles\Meveto\Exports"

    if ($users) {
        If (!(Test-Path $fileDirectory)) {
            # Create the "Meveto" folder first if it doesn't exist.
            New-Item -ItemType Directory -Path $fileDirectory | Out-Null
        }

        $users | ConvertTo-Csv -NoTypeInformation | Select-Object -Skip 1 | Set-Content "$fileDirectory\users.csv"
    }

    # Attempt to identify any deleted users. Valid only if a dateString has been specified.
    if ($dateString) {
        if ($searchBase) {
            $command = "Get-ADObject -SearchBase `"$searchBase`" -Server $server -Credential `$credential -Filter {objectClass -eq `"user`" -and whenChanged -ge `$dateString -and isDeleted -eq `$true} -IncludeDeletedObjects -Properties whenChanged, isDeleted, objectGuid"
        } else {
            $command = "Get-ADObject -Server $server -Credential `$credential -Filter {objectClass -eq `"user`" -and whenChanged -ge `$dateString -and isDeleted -eq `$true} -IncludeDeletedObjects -Properties whenChanged, isDeleted, objectGuid"
        }

        Invoke-Expression $command | Select-Object objectGuid | ConvertTo-Csv -NoTypeInformation | Select-Object -Skip 1 | Set-Content "$fileDirectory\deleted-users.csv"
    }
}
catch {
    Write-Host $_.Exception.Message
    exit 1
}
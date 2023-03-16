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
        $command = "Get-ADGroup -SearchBase `"$searchBase`" -Server $server -Credential `$credential -Filter {whenChanged -ge `$dateString} -Properties objectGuid, name, description, cn, whenChanged, member"
    } else {
        $command = "Get-ADGroup -Server $server -Credential `$credential -Filter {whenChanged -ge `$dateString} -Properties objectGuid, name, description, cn, whenChanged, member"
    }
} else {
    if ($searchBase) {
        $command = "Get-ADGroup -SearchBase `"$searchBase`" -Server $server -Credential `$credential -Filter * -Properties objectGuid, name, description, cn, whenChanged, member"
    } else {
        $command = "Get-ADGroup -Server $server -Credential `$credential -Filter * -Properties objectGuid, name, description, cn, whenChanged, member"
    }
}

try {
    $groups = Invoke-Expression $command | ForEach-Object {
        $users = Get-ADGroupMember -Server $server -Credential $credential -Identity $_.objectGuid | Where-Object { $_.ObjectClass -eq "user" } | ForEach-Object { $_.objectGuid }

        $displayName = if ($_.name) {
            $_.name
        } else {
            $_.cn
        }

        $_ | Select-Object @{Name="Name";Expression={$displayName}}, description, objectGuid, @{Name="Users";Expression={$users -join ":"}}
    }

    $fileDirectory = "$env:ProgramFiles\Meveto\Exports"

    if ($groups) {
        If (!(Test-Path $fileDirectory)) {
            # Create the "Meveto" folder first if it doesn't exist.
            New-Item -ItemType Directory -Path $fileDirectory | Out-Null
        }

        $groups | ConvertTo-Csv -NoTypeInformation | Select-Object -Skip 1 | Set-Content "$fileDirectory\groups.csv"
    }

    # Attempt to identify any deleted groups. Valid only if a dateString has been specified.
    if ($dateString) {
        Get-ADObject -Server $server -Credential $credential -Filter {objectClass -eq "group" -and whenChanged -ge $dateString -and isDeleted -eq $true} -IncludeDeletedObjects -Properties whenChanged, isDeleted, objectGuid | Select-Object objectGuid | ConvertTo-Csv -NoTypeInformation | Select-Object -Skip 1 | Set-Content "$fileDirectory\deleted-groups.csv"
    }
}
catch {
    Write-Host $_.Exception.Message
    exit 1
}
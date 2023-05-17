param (
    [Parameter(Mandatory=$true)][string]$updateUrl
)

$backupLocation = "$env:ProgramFiles\Meveto\backup"

Try {
    If (!(Test-Path $backupLocation)) {
        New-Item -ItemType Directory -Force -Path $backupLocation | Out-Null
    }

    Copy-Item -Path "$env:ProgramFiles\Meveto\config\default.json" -Destination $backupLocation
}
Catch {
    Write-Error $_.Exception.Message
    Exit 1
}

Try {
  $connector = Get-WmiObject -Class Win32_Product | Where-Object { $_.Name -match "Meveto AD/LDAP Connector" }
  
  if ($null -ne $connector) {
    $connector.Uninstall()
  }
}
Catch {
    Write-Error $_.Exception.Message
    Exit 1
}

Try {
  $msiDownloadLocation = [io.path]::combine($env:TEMP, 'meveto-' + $(Get-Date -f yyyyMMdd-HHmmss) + '.msi')
  $webClient = New-Object System.Net.WebClient
  $webClient.DownloadFile($updateUrl, $msiDownloadLocation)

  $logTo = [io.path]::combine($env:TEMP, 'meveto-connector.log')

  $msiArgs = @()
  $msiArgs += "/i "
  $msiArgs += "`"$msiDownloadLocation`" "
  $msiArgs += "/l "
  $msiArgs += "`"$logTo`" "
  $msiArgs += "/qn "
  $msiArgs += "RebootYesNo=`"No`" "
  $msiArgs += "REBOOT=`"Suppress`" "
  $msiArgs += "/quiet "
  
  Start-Process "msiexec.exe" -ArgumentList $msiArgs -Wait

  $connectorService = Get-Service "Meveto"

  if ($null -ne $connectorService) {
    if ($connectorService.Status -eq "Running") {
        Stop-Service "Meveto"
        $connectorService = Get-Service "Meveto"
        $connectorService.WaitForStatus('Stopped','00:00:30')
    }

    Copy-Item -Path "$backupLocation\default.json" -Destination "$env:ProgramFiles\Meveto\config\default.json"
    Remove-Item $backupLocation -Recurse -Force
    Start-Service "Meveto"
  }
}
Catch {
    Write-Error $_.Exception.Message
    Exit 1
}
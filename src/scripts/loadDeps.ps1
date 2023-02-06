# Find and load a given module with an optional minimum required version.
Function Load-Module(
    [string] [Parameter(Mandatory = $true)] $name,
    [string] $minVersion
) {
    # This method relies on the PowershellGet module. First check if that is available.
    if (-not (Get-Module -ListAvailable -Name "PowershellGet")) {
        Write-Verbose "Installing module PowershellGet within scope of the current user."
        Install-Module -Name PowerShellGet -RequiredVersion 2.2.5 -Scope CurrentUser -Force -Verbose
    }

    $module = Get-Module -Name $name -ListAvailable |`
        Where-Object { $null -eq $minVersion -or $minVersion -lt $_.Version } |`
        Select-Object -Last 1
    
    if ($null -ne $module) {
        # Module is available and imported. Simply Skip.
        Write-Verbose ('Module `{0}` (v{1}) is available.' -f $name, $module.Version)
        return
    }

    # Otherwise, attempt to import the specified module and version. If the import fails, then attempt to first
    # install it and then import it.
    Import-Module -Name 'PowerShellGet'
    $installedModule = Get-InstalledModule -Name $name -ErrorAction SilentlyContinue
    if ($null -ne $installedModule) {
        Write-Verbose ('Module `{0}` (v{1}) is available.' -f $name, $installedModule.Version)
    }

    # If the module is not installed or installed but less than the minimum required version.
    if ($null -eq $installedModule -or ($null -ne $minVersion -and $installedModule.Version -lt $minVersion)) {
        Write-Warning ('v{0} of module `{1}` is not the required minimum version v{2}. Attempting to install the required minimum version.' -f $installedModule.Version, $name, $minVersion)

        # First check if package provider NuGet is installed. If not, install it for better package management.
        if ((Get-PackageProvider -Name NuGet -Force).Version -lt '2.8.5.201') {
            Write-Warning 'Installing NuGet package manager within scope of the current user.'
            Install-PackageProvider -Name NuGet -MinimumVersion 2.8.5.201 -Scope CurrentUser -Force
        }

        $optionalArgs = New-Object -TypeName Hashtable

        # If min version was specified, attach it.
        if ($null -ne $minVersion) {
            $optionalArgs['RequiredVersion'] = $minVersion
        }

        Write-Warning ('Installing module `{0}` (v[{1}]) within scope of the current user.' -f $name, $minVersion)
        Install-Module -Name $name @optionalArgs -Scope CurrentUser -Force -Verbose
    }
}

Write-Verbose "Checking required modules."

# Load the CredentialManager module
Load-Module 'CredentialManager' '2.0'

Write-Verbose "Required modules available."
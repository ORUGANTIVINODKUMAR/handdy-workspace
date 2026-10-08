!include LogicLib.nsh

; Recreate only CRM's own shortcuts, pointing at the newly installed executable.
; A fresh local shortcut does not inherit the downloaded shortcut's zone stream.
; Keep a rollback copy and leave the original intact if staging fails.
!macro repairCrmShortcut LINK EXE
  Push $R0
  Push $R1
  StrCpy $R0 "${LINK}"
  StrCpy $R1 "${EXE}"
  ${If} ${FileExists} "$R0"
  ${AndIf} ${FileExists} "$R1"
    InitPluginsDir
    Delete "$PLUGINSDIR\crm-shortcut-new.lnk"
    Delete "$PLUGINSDIR\crm-shortcut-backup.lnk"
    ClearErrors
    CreateShortCut "$PLUGINSDIR\crm-shortcut-new.lnk" "$R1" "" "$R1" 0 "" "" "${APP_DESCRIPTION}"
    ${IfNot} ${Errors}
      WinShell::SetLnkAUMI "$PLUGINSDIR\crm-shortcut-new.lnk" "${APP_ID}"
      ClearErrors
      CopyFiles /SILENT "$R0" "$PLUGINSDIR\crm-shortcut-backup.lnk"
      ${IfNot} ${Errors}
        ClearErrors
        Delete "$R0"
        ${IfNot} ${Errors}
          ClearErrors
          CopyFiles /SILENT "$PLUGINSDIR\crm-shortcut-new.lnk" "$R0"
          ${If} ${Errors}
            CopyFiles /SILENT "$PLUGINSDIR\crm-shortcut-backup.lnk" "$R0"
            DetailPrint "CRM shortcut repair failed; restored the previous shortcut: $R0"
          ${Else}
            DetailPrint "Recreated CRM shortcut: $R0"
          ${EndIf}
        ${Else}
          DetailPrint "CRM shortcut is locked; left it unchanged: $R0"
        ${EndIf}
      ${Else}
        DetailPrint "Could not back up CRM shortcut; left it unchanged: $R0"
      ${EndIf}
    ${Else}
      DetailPrint "Could not stage CRM shortcut; left it unchanged: $R0"
    ${EndIf}
  ${EndIf}
  Pop $R1
  Pop $R0
!macroend

!macro customInstall
  !insertmacro repairCrmShortcut "$newDesktopLink" "$appExe"
  !insertmacro repairCrmShortcut "$newStartMenuLink" "$appExe"
  ; Taskbar pins are per user even for a machine-wide installation.
  SetShellVarContext current
  !insertmacro repairCrmShortcut "$APPDATA\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar\${SHORTCUT_NAME}.lnk" "$appExe"
  ${If} $installMode == "all"
    SetShellVarContext all
  ${EndIf}
  System::Call 'Shell32::SHChangeNotify(i 0x8000000, i 0, i 0, i 0)'
!macroend

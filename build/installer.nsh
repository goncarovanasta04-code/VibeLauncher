!include nsDialogs.nsh
!include LogicLib.nsh

!ifdef BUILD_UNINSTALLER
Var KeepUserDataCheckbox
Var DeleteGameDataCheckbox
Var KeepUserDataValue
Var DeleteGameDataValue

; Insert custom uninstaller page before the uninstallation confirmation
UninstPage custom un.CustomUninstallerPage un.CustomUninstallerPageLeave

Function un.CustomUninstallerPage
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  ; Заголовок страницы удаления
  ${NSD_CreateLabel} 0 0 100% 16u "Удаление VibeLauncher — Параметры очистки"
  Pop $0
  CreateFont $1 "$(^Font)" "11" "700"
  SendMessage $0 ${WM_SETFONT} $1 0

  ${NSD_CreateLabel} 0 18u 100% 24u "Пожалуйста, выберите, какие компоненты необходимо сохранить или полностью удалить:"
  Pop $0

  ; Чекбокс 1: Сохранить личные данные
  ${NSD_CreateCheckbox} 10u 44u 95% 15u "Сохранить личные данные (настройки лаунчера, сохранённые аккаунты)"
  Pop $KeepUserDataCheckbox
  ; По умолчанию НЕ отмечено, чтобы при удалении всё очищалось, если пользователь не захочет сохранить
  ${NSD_SetState} $KeepUserDataCheckbox ${BST_UNCHECKED}

  ; Чекбокс 2: Удалить файлы Minecraft
  ${NSD_CreateCheckbox} 10u 64u 95% 15u "Удалить существующие на вашем ПК файлы Minecraft (%AppData%\.vibelauncher)"
  Pop $DeleteGameDataCheckbox
  ${NSD_SetState} $DeleteGameDataCheckbox ${BST_UNCHECKED}

  ${NSD_CreateLabel} 10u 88u 95% 24u "Примечание: если не выбрано удаление папки Minecraft, все сохранённые миры и скачанные моды останутся на вашем компьютере."
  Pop $0

  nsDialogs::Show
FunctionEnd

Function un.CustomUninstallerPageLeave
  ${NSD_GetState} $KeepUserDataCheckbox $KeepUserDataValue
  ${NSD_GetState} $DeleteGameDataCheckbox $DeleteGameDataValue
FunctionEnd
!endif

!macro customUnInstall
  ; 1. Если пользователь НЕ выбрал "Сохранить личные данные", удаляем все данные лаунчера (настройки, аккаунты, кэш)
  ${If} $KeepUserDataValue != ${BST_CHECKED}
    RMDir /r "$APPDATA\vibelauncher"
    RMDir /r "$APPDATA\VibeLauncher"
    RMDir /r "$LOCALAPPDATA\vibelauncher"
    RMDir /r "$LOCALAPPDATA\VibeLauncher"
    RMDir /r "$LOCALAPPDATA\vibelauncher-updater"
  ${EndIf}

  ; 2. Если пользователь выбрал "Удалить существующие на вашем ПК файлы Minecraft", удаляем всю директорию игры
  ${If} $DeleteGameDataValue == ${BST_CHECKED}
    RMDir /r "$APPDATA\.vibelauncher"
  ${EndIf}
!macroend

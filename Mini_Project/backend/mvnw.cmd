@REM ----------------------------------------------------------------------------
@REM Licensed to the Apache Software Foundation (ASF) under one
@REM or more contributor license agreements.  See the NOTICE file
@REM distributed with this work for additional information
@REM regarding copyright ownership.  The ASF licenses this file
@REM to you under the Apache License, Version 2.0 (the
@REM "License"); you may not use this file except in compliance
@REM with the License.  You may obtain a copy of the License at
@REM
@REM    http://www.apache.org/licenses/LICENSE-2.0
@REM
@REM Unless required by applicable law or agreed to in writing,
@REM software distributed under the License is distributed on an
@REM "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
@REM KIND, either express or implied.  See the License for the
@REM specific language governing permissions and limitations
@REM under the License.
@REM ----------------------------------------------------------------------------

@REM Begin all REM://
@echo off

@REM Set the current directory to the location of this script
set MAVEN_PROJECTBASEDIR=%~dp0

@setlocal

set WRAPPER_JAR="%MAVEN_PROJECTBASEDIR%.mvn\wrapper\maven-wrapper.jar"
set WRAPPER_PROPERTIES="%MAVEN_PROJECTBASEDIR%.mvn\wrapper\maven-wrapper.properties"

@REM Extension to allow automatically downloading the maven-wrapper.jar from Maven-central
@REM This allows using the maven wrapper in projects that prohibit checking in binary data.
if exist %WRAPPER_JAR% (
    echo Found %WRAPPER_JAR%
) else (
    echo Downloading from: https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.2.0/maven-wrapper-3.2.0.jar
    powershell -Command "&{"^
		"$webclient = new-object System.Net.WebClient;"^
		"if (-not ([string]::IsNullOrEmpty('%MAVEN_USERNAME%') -and [string]::IsNullOrEmpty('%MAVEN_PASSWORD%'))) {"^
		"$webclient.Credentials = new-object System.Net.NetworkCredential('%MAVEN_USERNAME%', '%MAVEN_PASSWORD%');"^
		"}"^
		"[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $webclient.DownloadFile('https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.2.0/maven-wrapper-3.2.0.jar', '%WRAPPER_JAR%')"^
		"}"
    echo Finished downloading %WRAPPER_JAR%
)

@REM Provide a "standardized" way to retrieve the CLI args that will
@REM temporary work://
set MAVEN_CMD_LINE_ARGS=%*

@REM Find the project basedir, i.e., the directory that contains the project object model (pom.xml).
set EXEC_DIR=%CD%
set WDIR=%EXEC_DIR%

@REM Look for Maven distribution
if not "%MAVEN_HOME%"=="" goto MAVEN_HOME_SET
if not "%M2_HOME%"=="" goto M2_HOME_SET

@REM Try to use wrapper jar
if exist %WRAPPER_JAR% (
    set LAUNCHER="%JAVA_HOME%\bin\java.exe"
    if exist !LAUNCHER! (
        set MAVEN_CMD_LINE_ARGS=%MAVEN_CMD_LINE_ARGS%
        %LAUNCHER% %MAVEN_OPTS% ^
            -classpath %WRAPPER_JAR% ^
            org.apache.maven.wrapper.MavenWrapperMain %MAVEN_CMD_LINE_ARGS%
        if ERRORLEVEL 1 goto error
        goto end
    )
)

@REM Fallback: download Maven directly
set MAVEN_DIST_URL=https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.9.6/apache-maven-3.9.6-bin.zip
set MAVEN_DIR=%USERPROFILE%\.m2\wrapper\dists\apache-maven-3.9.6

if not exist "%MAVEN_DIR%\bin\mvn.cmd" (
    echo Maven not found. Downloading Maven 3.9.6...
    if not exist "%MAVEN_DIR%" mkdir "%MAVEN_DIR%"
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('%MAVEN_DIST_URL%', '%MAVEN_DIR%\maven.zip')"
    powershell -Command "Expand-Archive -Path '%MAVEN_DIR%\maven.zip' -DestinationPath '%MAVEN_DIR%' -Force"
    @REM Move contents from nested directory
    for /d %%i in ("%MAVEN_DIR%\apache-maven-*") do (
        xcopy /s /e /y "%%i\*" "%MAVEN_DIR%\" >nul
        rmdir /s /q "%%i"
    )
    del "%MAVEN_DIR%\maven.zip" 2>nul
    echo Maven 3.9.6 installed to %MAVEN_DIR%
)

set MAVEN_HOME=%MAVEN_DIR%
echo Using Maven from: %MAVEN_HOME%

:MAVEN_HOME_SET
:M2_HOME_SET

@REM Use Maven
"%MAVEN_HOME%\bin\mvn.cmd" %MAVEN_CMD_LINE_ARGS%
if ERRORLEVEL 1 goto error
goto end

:error
set ERROR_CODE=1

:end
@endlocal & set ERROR_CODE=%ERROR_CODE%
cmd /C exit /B %ERROR_CODE%

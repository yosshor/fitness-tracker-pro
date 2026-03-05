# Capacitor - keep WebView JS bridge
-keep class com.getcapacitor.** { *; }
-keep class com.cybergym.fitnesstracker.** { *; }

# Keep JavaScript interface methods
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep Capacitor plugin classes
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }

# AndroidX
-keep class androidx.** { *; }
-dontwarn androidx.**

# Keep line numbers for crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

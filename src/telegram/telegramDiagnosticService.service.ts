import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as TelegramBot from "node-telegram-bot-api";

@Injectable()
export class TelegramDiagnosticService {
  private readonly logger = new Logger(TelegramDiagnosticService.name);

  constructor(private configService: ConfigService) {}

  async diagnoseBot(bot: TelegramBot): Promise<{
    status: "OK" | "ERROR";
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Check 1: Verify bot token
      const token = this.configService.get<string>("TELEGRAM_BOT_TOKEN");
      if (!token) {
        issues.push("Bot token is missing");
        recommendations.push(
          "Ensure TELEGRAM_BOT_TOKEN is set in environment variables"
        );
      }

      // Check 2: Verify bot connection
      try {
        const botInfo = await bot.getMe();
        this.logger.log(`Bot connected successfully: @${botInfo.username}`);
      } catch (error) {
        issues.push("Failed to connect to Telegram API");
        recommendations.push(
          "Check if bot token is valid",
          "Verify network connectivity to api.telegram.org",
          "Ensure no firewall is blocking the connection"
        );
      }

      // Check 3: Verify webhook status
      try {
        const webhookInfo = await bot.getWebHookInfo();
        if (webhookInfo.url) {
          issues.push("Webhook is still active");
          recommendations.push(
            "Remove webhook using bot.deleteWebHook()",
            "Ensure no other instances are running with webhook"
          );
        }
      } catch (error) {
        issues.push("Failed to check webhook status");
      }

      // Check 4: Verify polling status
      if (!bot.isPolling()) {
        issues.push("Polling is not active");
        recommendations.push(
          "Ensure bot.startPolling() is called",
          "Check for any polling errors in logs"
        );
      }

      // Check 5: Memory usage
      const memoryUsage = process.memoryUsage();
      if (memoryUsage.heapUsed > 500 * 1024 * 1024) {
        // 500MB
        issues.push("High memory usage detected");
        recommendations.push(
          "Check for memory leaks",
          "Consider restarting the bot"
        );
      }

      return {
        status: issues.length === 0 ? "OK" : "ERROR",
        issues,
        recommendations: [...new Set(recommendations)],
      };
    } catch (error) {
      this.logger.error("Diagnostic error:", error);
      return {
        status: "ERROR",
        issues: ["Failed to complete diagnostics"],
        recommendations: ["Check server logs for more details"],
      };
    }
  }

  // async fixCommonIssues(bot: TelegramBot): Promise<void> {
  //   try {
  //     // 1. Delete any existing webhook
  //     await bot.deleteWebHook();

  //     // 2. Stop polling if active
  //     if (bot.isPolling()) {
  //       await bot.stopPolling();
  //     }

  //     // 3. Restart polling with optimal settings
  //     await bot.startPolling({
  //       polling: {
  //         interval: 300, // Poll every 300ms
  //         autoStart: true,
  //         params: {
  //           timeout: 10,
  //         },
  //       },
  //     });

  //     this.logger.log("Bot polling restarted successfully");
  //   } catch (error) {
  //     this.logger.error("Failed to fix common issues:", error);
  //     throw error;
  //   }
  // }

  async fixCommonIssues(bot: TelegramBot): Promise<void> {
    try {
      // Add safety checks before calling methods
      if (typeof bot.deleteWebHook === "function") {
        await bot.deleteWebHook();
      } else {
        this.logger.warn("deleteWebHook method not available on bot instance");
      }

      if (typeof bot.isPolling === "function" && bot.isPolling()) {
        await bot.stopPolling();
      } else {
        this.logger.warn("isPolling method not available or bot not polling");
      }

      // Only try to start polling if the method exists
      if (typeof bot.startPolling === "function") {
        await bot.startPolling({
          polling: {
            interval: 300,
            autoStart: true,
            params: {
              timeout: 10,
            },
          },
        });
        this.logger.log("Bot polling restarted successfully");
      } else {
        this.logger.warn("startPolling method not available on bot instance");
      }
    } catch (error) {
      this.logger.error("Failed to fix common issues:", error);
      throw error;
    }
  }
}

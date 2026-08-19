#include "webserver.h"
#include "webpage.h"
#include "config.h"
#include "relay.h"
#include "sensor.h"
#include "status.h"
#include "automation.h"
#include <ESP8266WebServer.h>

ESP8266WebServer server(80);

// =====================================================
// ACCESS CHECK (LAN)
// =====================================================

bool accessGranted() {

  // Kunci kosong = tanpa proteksi
  if (strlen(WEB_ACCESS_KEY) == 0) {
    return true;
  }

  return (
    server.hasArg("key") &&
    server.arg("key") == String(WEB_ACCESS_KEY)
  );
}

void handleRoot() {

  // Suntikkan kunci akses ke halaman (hanya jika diaktifkan)
  if (strlen(WEB_ACCESS_KEY) > 0) {

    String html =
      FPSTR(INDEX_HTML);

    html.replace(
      "{{KEY}}",
      String(WEB_ACCESS_KEY)
    );

    server.send(
      200,
      "text/html",
      html
    );

  } else {

    server.send_P(
      200,
      "text/html",
      INDEX_HTML
    );
  }
}

void handleStatus() {

  server.send(
    200,
    "application/json",
    buildStatusJSON()
  );
}

void handleSensor() {

  updateSensor();

  server.send(
    200,
    "application/json",
    buildSensorJSON()
  );
}

void handleConfig() {

  server.send(
    200,
    "application/json",
    buildConfigJSON()
  );
}

void handleNotFound() {

  String uri =
    server.uri();

  // -------------------------------------------
  // SINGLE RELAY: /relay/N/on atau /relay/N/off
  // -------------------------------------------

  if (
    uri.startsWith("/relay/")
  ) {

    if (!accessGranted()) {

      server.send(
        401,
        "text/plain",
        "Unauthorized"
      );

      return;
    }

    int first =
      uri.indexOf(
        '/',
        7
      );

    if (first > 0) {

      String number =
        uri.substring(
          7,
          first
        );

      String action =
        uri.substring(
          first + 1
        );

      int relay =
        number.toInt();

      if (
        relay >= 1 &&
        relay <= RELAY_COUNT
      ) {

        bool state =
          action == "on";

        // Kontrol manual -> relay pindah ke mode MANUAL
        // (dijeda dari automation sampai user set AUTO lagi).
        automationSetRelayMode(relay - 1, false);

        setRelay(
          relay - 1,
          state
        );

        server.send(
          200,
          "application/json",
          buildStatusJSON()
        );

        return;
      }
    }
  }

  // -------------------------------------------
  // ALL ON / ALL OFF
  // -------------------------------------------

  if (
    uri == "/all/on"
  ) {

    if (!accessGranted()) {

      server.send(
        401,
        "text/plain",
        "Unauthorized"
      );

      return;
    }

    for (uint8_t i = 0; i < RELAY_COUNT; i++) {
      automationSetRelayMode(i, false);
    }

    setAllRelays(true);

    server.send(
      200,
      "application/json",
      buildStatusJSON()
    );

    return;
  }

  if (
    uri == "/all/off"
  ) {

    if (!accessGranted()) {

      server.send(
        401,
        "text/plain",
        "Unauthorized"
      );

      return;
    }

    for (uint8_t i = 0; i < RELAY_COUNT; i++) {
      automationSetRelayMode(i, false);
    }

    setAllRelays(false);

    server.send(
      200,
      "application/json",
      buildStatusJSON()
    );

    return;
  }

  server.send(
    404,
    "text/plain",
    "Not Found"
  );
}

// =====================================================
// INIT
// =====================================================

void initWebServer() {

  server.on(
    "/",
    HTTP_GET,
    handleRoot
  );

  server.on(
    "/status",
    HTTP_GET,
    handleStatus
  );

  server.on(
    "/sensor",
    HTTP_GET,
    handleSensor
  );

  server.on(
    "/config",
    HTTP_GET,
    handleConfig
  );

  server.onNotFound(
    handleNotFound
  );

  server.begin();
}

void handleWebClient() {

  server.handleClient();
}
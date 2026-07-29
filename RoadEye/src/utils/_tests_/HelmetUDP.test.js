import { encodeNavigation, WeatherIcon } from "../HelmetUDP";

describe("encodeNavigation()", () => {

  test("returns a packet of length 14", () => {
    const result = encodeNavigation({
      speed: 45,
      distRemaining: 5,
      completionPct: 60,
      startWeather: WeatherIcon.SUNNY,
      destWeather: WeatherIcon.CLOUDY,
    });

    expect(result.length).toBe(14);
  });

  test("encodes zero values", () => {
    const result = encodeNavigation({
      speed: 0,
      distRemaining: 0,
      completionPct: 0,
      startWeather: WeatherIcon.SUNNY,
      destWeather: WeatherIcon.SUNNY,
    });

    expect(result.length).toBe(14);
  });

  test("encodes completion percentage of 100", () => {
    const result = encodeNavigation({
      speed: 20,
      distRemaining: 1,
      completionPct: 100,
      startWeather: WeatherIcon.RAIN,
      destWeather: WeatherIcon.CLOUDY,
    });

    expect(result.length).toBe(14);
  });

  test("accepts negative speed", () => {
    const result = encodeNavigation({
      speed: -20,
      distRemaining: 5,
      completionPct: 50,
      startWeather: WeatherIcon.SUNNY,
      destWeather: WeatherIcon.SUNNY,
    });

    expect(result.length).toBe(14);
  });

  test("throws error when input is null", () => {
    expect(() => encodeNavigation(null)).toThrow();
  });

});
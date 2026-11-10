# NEED TO CHECK THIS SCRIPT

# Import("env")

# print("### pmgHub web.py loadded ###")

# import csv
# import os
# import subprocess

# PROJECT_DIR = env.subst("$PROJECT_DIR")
# BUILD_DIR = env.subst("$BUILD_DIR")
# WEB_DIR = os.path.join(PROJECT_DIR, "web")
# PARTITIONS_FILE = os.path.join(PROJECT_DIR, "partitions.csv")
# WEB_IMAGE = os.path.join(BUILD_DIR, "web.bin")
# PARTITION_NAME = "web"

# def parse_size(value):
#     value = value.strip()
#     if value.lower().startswith("0x"):
#         return int(value, 16)
#     suffixes = {
#         "k": 1024,
#         "kb": 1024,
#         "m": 1024 * 1024,
#         "mb": 1024 * 1024,
#     }
#     value_lower = value.lower()
#     for suffix, multiplier in suffixes.items():
#         if value_lower.endswith(suffix):
#             number = float(value_lower[:-len(suffix)])
#             return int(number * multiplier)
#     return int(value)

# def find_partition(name):
#     with open(PARTITIONS_FILE, "r", newline="", encoding="utf-8") as f:
#         reader = csv.reader(f)
#         for row in reader:
#             if not row:
#                 continue
#             first = row[0].strip()
#             if not first or first.startswith("#"):
#                 continue
#             if first != name:
#                 continue
#             if len(row) < 5:
#                 raise RuntimeError(
#                     f"Invalid partition definition for '{name}'"
#                 )
#             offset = row[3].strip()
#             size = row[4].strip()
#             if not offset:
#                 raise RuntimeError(
#                     f"Partition '{name}' must have an explicit offset"
#                 )
#             if not size:
#                 raise RuntimeError(
#                     f"Partition '{name}' must have an explicit size"
#                 )
#             return {
#                 "offset": parse_size(offset),
#                 "size": parse_size(size),
#             }
#     raise RuntimeError(
#         f"Partition '{name}' not found in {PARTITIONS_FILE}"
#     )

# def get_mklittlefs():
#     tool = env.subst("$MKFSTOOL")
#     if tool and os.path.isfile(tool):
#         return tool
#     raise RuntimeError(
#         "mklittlefs not found. "
#         "Check that board_build.filesystem = littlefs is configured."
#     )

# def build_web(source=None, target=None, env=None):
#     partition = find_partition(PARTITION_NAME)
#     tool = get_mklittlefs()
#     os.makedirs(BUILD_DIR, exist_ok=True)
#     if not os.path.isdir(WEB_DIR):
#         raise RuntimeError(
#             f"Web directory does not exist: {WEB_DIR}"
#         )
#     print()
#     print("Building pmgHub WEB filesystem")
#     print(f"Source    : {WEB_DIR}")
#     print(f"Partition : {PARTITION_NAME}")
#     print(f"Size      : {partition['size']} bytes")
#     print(f"Output    : {WEB_IMAGE}")
#     print()
#     command = [
#         tool,
#         "-c", WEB_DIR,
#         "-b", "4096",
#         "-p", "256",
#         "-s", str(partition["size"]),
#         WEB_IMAGE,
#     ]
#     subprocess.run(command, check=True)
#     print()
#     print("WEB filesystem image created successfully.")
#     print()

# def upload_web(source=None, target=None, env=None):
#     # Always rebuild before upload.
#     build_web()
#     partition = find_partition(PARTITION_NAME)
#     offset = f"0x{partition['offset']:X}"
#     upload_port = env.subst("$UPLOAD_PORT")
#     if not upload_port:
#         raise RuntimeError(
#             "No upload port detected. "
#             "Configure upload_port or connect the ESP32."
#         )
#     esptool = env.subst("$UPLOADER")
#     if not esptool:
#         raise RuntimeError("esptool uploader not found")
#     print()
#     print("Uploading pmgHub WEB filesystem")
#     print(f"Port   : {upload_port}")
#     print(f"Offset : {offset}")
#     print(f"Image  : {WEB_IMAGE}")
#     print()
#     command = [
#         esptool,
#         "--chip", "esp32s3",
#         "--port", upload_port,
#         "--baud", "460800",
#         "write_flash",
#         offset,
#         WEB_IMAGE,
#     ]
#     subprocess.run(command, check=True)
#     print()
#     print("WEB filesystem uploaded successfully.")
#     print()

# env.AddCustomTarget(
#     name="buildweb",
#     dependencies=None,
#     actions=build_web,
#     title="Build Web",
#     description="Build pmgHub web LittleFS partition",
# )

# env.AddCustomTarget(
#     name="uploadweb",
#     dependencies=None,
#     actions=upload_web,
#     title="Upload Web",
#     description="Build and upload pmgHub web LittleFS partition",
# )

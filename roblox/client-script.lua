-- Roblox Client Script (LocalScript içine koy)
-- Bunu Roblox exploit'ine yapıştır

local HTTP = game:GetService("HttpService")
local BACKEND_URL = "https://your-project.vercel.app" -- Değiştir!
local PLAYER = game.Players.LocalPlayer

-- HWID Oluştur
local function getHWID()
    local hwid_data = {
        ComputerName = os.getenv("COMPUTERNAME") or "Unknown",
        UserName = os.getenv("USERNAME") or "Unknown",
        MachineGuid = game:GetService("UserInputService"):GetGamepadGuid(Enum.UserInputType.Gamepad1) or "Unknown"
    }
    
    -- SHA256 hash yapmak için simple bir yöntem:
    return game:GetService("HttpService"):GenerateGUID(false):sub(1, 32)
end

-- Key Validate Et
local function validateKey(key)
    local hwid = getHWID()
    
    local success, response = pcall(function()
        return HTTP:PostAsync(
            BACKEND_URL .. "/api/validate-key",
            HTTP:JSONEncode({
                key = key,
                hwid_data = hwid
            }),
            Enum.HttpContentType.ApplicationJson
        )
    end)

    if success then
        local data = HTTP:JSONDecode(response)
        return data.valid, data
    else
        warn("Validation failed: " .. tostring(response))
        return false, {reason = "Network error"}
    end
end

-- Key Redeem Et
local function redeemKey(key)
    local hwid = getHWID()
    
    local success, response = pcall(function()
        return HTTP:PostAsync(
            BACKEND_URL .. "/api/redeem-key",
            HTTP:JSONEncode({
                key = key,
                hwid_data = hwid
            }),
            Enum.HttpContentType.ApplicationJson
        )
    end)

    if success then
        local data = HTTP:JSONDecode(response)
        return data.success, data
    else
        return false, {reason = "Network error"}
    end
end

-- UI Example
local playerGui = PLAYER:WaitForChild("PlayerGui")
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "KeySystem"
screenGui.ResetOnSpawn = false
screenGui.Parent = playerGui

-- Input TextBox
local textBox = Instance.new("TextBox")
textBox.Name = "KeyInput"
textBox.Size = UDim2.new(0, 300, 0, 40)
textBox.Position = UDim2.new(0.5, -150, 0.5, -50)
textBox.BackgroundColor3 = Color3.fromRGB(30, 30, 30)
textBox.TextColor3 = Color3.fromRGB(255, 255, 255)
textBox.TextScaled = true
textBox.PlaceholderText = "Anahtarı gir..."
textBox.Parent = screenGui

-- Validate Button
local validateBtn = Instance.new("TextButton")
validateBtn.Name = "ValidateBtn"
validateBtn.Size = UDim2.new(0, 140, 0, 40)
validateBtn.Position = UDim2.new(0.5, -150, 0.5, 20)
validateBtn.BackgroundColor3 = Color3.fromRGB(52, 152, 219)
validateBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
validateBtn.TextScaled = true
validateBtn.Text = "✅ Doğrula"
validateBtn.Parent = screenGui

validateBtn.MouseButton1Click:Connect(function()
    local key = textBox.Text
    if key == "" then
        validateBtn.Text = "❌ Boş!"
        wait(2)
        validateBtn.Text = "✅ Doğrula"
        return
    end

    validateBtn.Text = "⏳ Kontrol ediliyor..."
    local valid, data = validateKey(key)
    
    if valid then
        validateBtn.Text = "✅ Geçerli!"
        validateBtn.BackgroundColor3 = Color3.fromRGB(46, 204, 113)
        
        -- Script'i aktif et / Özellik ver
        print("✅ Anahtar geçerli! Type: " .. data.key_type)
        
        wait(2)
        validateBtn.Text = "✅ Doğrula"
        validateBtn.BackgroundColor3 = Color3.fromRGB(52, 152, 219)
    else
        validateBtn.Text = "❌ " .. data.reason
        validateBtn.BackgroundColor3 = Color3.fromRGB(231, 76, 60)
        
        wait(3)
        validateBtn.Text = "✅ Doğrula"
        validateBtn.BackgroundColor3 = Color3.fromRGB(52, 152, 219)
    end
end)

-- Redeem Button
local redeemBtn = Instance.new("TextButton")
redeemBtn.Name = "RedeemBtn"
redeemBtn.Size = UDim2.new(0, 140, 0, 40)
redeemBtn.Position = UDim2.new(0.5, 10, 0.5, 20)
redeemBtn.BackgroundColor3 = Color3.fromRGB(155, 89, 182)
redeemBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
redeemBtn.TextScaled = true
redeemBtn.Text = "🔐 Redeem Et"
redeemBtn.Parent = screenGui

redeemBtn.MouseButton1Click:Connect(function()
    local key = textBox.Text
    if key == "" then
        redeemBtn.Text = "❌ Boş!"
        wait(2)
        redeemBtn.Text = "🔐 Redeem Et"
        return
    end

    redeemBtn.Text = "⏳ Yükleniyor..."
    local success, data = redeemKey(key)
    
    if success then
        redeemBtn.Text = "✅ Başarılı!"
        redeemBtn.BackgroundColor3 = Color3.fromRGB(46, 204, 113)
        
        print("✅ Anahtar başarıyla kullanıldı!")
        textBox.Text = ""
        
        wait(2)
        redeemBtn.Text = "🔐 Redeem Et"
        redeemBtn.BackgroundColor3 = Color3.fromRGB(155, 89, 182)
    else
        redeemBtn.Text = "❌ Hata: " .. data.reason
        redeemBtn.BackgroundColor3 = Color3.fromRGB(231, 76, 60)
        
        wait(3)
        redeemBtn.Text = "🔐 Redeem Et"
        redeemBtn.BackgroundColor3 = Color3.fromRGB(155, 89, 182)
    end
end)

print("✅ Key System Yüklendi!")
